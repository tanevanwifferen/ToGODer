import { Router } from 'express';
import { getDbContext } from '../Entity/Database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Mailer } from '../Email/mailer';

export function GetAuthRouter() {
  const authRouter = Router();

  authRouter.get('/api/auth/verify/:id/:code', async (req, res) => {
    const { id, code } = req.params;
    const db = getDbContext();
    const user = await db.user.findUnique({ where: { id: id } });
    if (!user) {
      return res.status(404).send('User not found');
    }
    if (user.verified) {
      return res.status(400).send('User already verified');
    }
    if (user.verificationToken !== code) {
      return res.status(400).send('Invalid verification code');
    }
    await db.user.update({ where: { id: id }, data: { verified: true } });
    res.redirect('/login');
  });

  // SIGN IN
  authRouter.post('/api/auth/signIn', async (req, res) => {
    console.log('signIn req.body', req.body);
    const db = getDbContext();
    const user = await db.user.findUnique({ where: { email: req.body.email } });

    if (!user || !user.verified) {
      res.status(401).send('Invalid email or password.');
    } else {
      const authenticated = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (authenticated) {
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!);

        res.json({ token: token, userId: user.id });
      } else {
        res.status(401).send('Invalid email or password.');
      }
    }
  });

  authRouter.post('/api/auth/signUp', async (req, res) => {
    try {
      // verify email is valid email address
      if (!req.body.email || !Mailer.IsValidEmailAddress(req.body.email)) {
        return res.status(400).send('Email is required');
      }
      if (!req.body.password || req.body.password.length < 8) {
        return res.status(400).send('Password is required');
      }

      const db = getDbContext();
      const user = await db.user.findUnique({
        where: { email: req.body.email },
      });

      if (user) {
        return res.status(400).send('User already exists!');
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      const newUser = {
        email: req.body.email,
        password: hashedPassword,
      };

      const createdUser = await db.user.create({ data: newUser });
      // TODO: Send verification email
      new Mailer().sendVerificationEmail(
        req.body.email,
        createdUser.id,
        createdUser.verificationToken
      );
      res.status(204).send();
    } catch (error) {
      console.log(error);
      res.status(500).send('Something went wrong');
    }
  });

  return authRouter;
}
