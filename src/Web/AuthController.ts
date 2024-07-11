import { Router } from 'express';
import { getDbContext } from '../Entity/Database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Mailer } from '../Email/mailer';
import { onlyOwner } from './Middleware/auth';

export function GetAuthRouter() {
  const authRouter = Router();

  // TODO: update account, update token, verify token
  authRouter.post(
    '/api/auth/updateToken',
    onlyOwner,
    async (req, res, next) => {
      try {
        const { id, date } = jwt.verify(
          req.body.token,
          process.env.JWT_SECRET!
        ) as { id: string; date: number };

        const token = jwt.sign(
          { id: req.body.userId, date: new Date().getTime() },
          process.env.JWT_SECRET!
        );
        res.json({ token: token });
      } catch (err) {
        console.log(err);
        res.status(500).send('Something went wrong');
      }
    }
  );

  authRouter.post('/api/auth/forgotPassword/:email', async (req, res, next) => {
    try {
      const message = 'If email exists, a password reset email will be sent.';
      const { email } = req.params;
      const db = getDbContext();
      const user = await db.user.findUnique({ where: { email: email } });
      if (!user) {
        return res.status(200).send(message);
      }
      if (!user.verified) {
        return res.status(200).send(message);
      }

      var tosign = { date: new Date().getTime(), id: user.id };
      var signed = jwt.sign(tosign, process.env.JWT_SECRET!);

      // send forgot password email
      new Mailer().sendForgotPasswordEmail(user.email, signed);
      res.status(200).send(message);
    } catch (err) {
      console.log(err);
      res.status(500).send('Something went wrong');
    }
  });

  authRouter.post(
    '/api/auth/resetPassword/:signature',
    async (req, res, next) => {
      try {
        // TODO: add nonce for password so a signature can only be used once.
        // Think a nonce in the db indicating how many passwords have been set ever.
        var { id, date } = jwt.verify(
          req.params.signature,
          process.env.JWT_SECRET!
        ) as { id: string; date: number };

        // 30 mins
        if (new Date().getTime() - date > 1000 * 60 * 30) {
          return res.status(400).send('Expired link');
        }

        const password = await bcrypt.hash(req.body.password, 10);
        const email = req.body.email;

        const db = getDbContext();

        const user = db.user.findUnique({ where: { id: id, email } });
        if (user == null) {
          return res.status(404).send('User not found');
        }
        await db.user.update({
          where: { id: id },
          data: { password: password },
        });
        return res.status(200).send('Password updated. You can now login.');
      } catch (err) {
        console.log(err);
        res.status(500).send('Something went wrong');
      }
    }
  );

  authRouter.get('/api/auth/verify/:id/:code', async (req, res, next) => {
    try {
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
      res.send('Verification succesful! you can now close this tab and login.');
    } catch (err) {
      console.log(err);
      res.status(500).send('Something went wrong');
    }
  });

  // SIGN IN
  authRouter.post('/api/auth/signIn', async (req, res, next) => {
    try {
      const db = getDbContext();
      const user = await db.user.findUnique({
        where: { email: req.body.email },
      });

      if (!user || !user.verified) {
        res.status(401).send('Invalid email or password.');
      } else {
        const authenticated = await bcrypt.compare(
          req.body.password,
          user.password
        );
        if (authenticated) {
          const tosign = { id: user.id, date: new Date().getTime() };
          const token = jwt.sign(tosign, process.env.JWT_SECRET!);

          res.json({ token: token, userId: user.id, date: tosign.date });
        } else {
          res.status(401).send('Invalid email or password.');
        }
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Something went wrong');
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
