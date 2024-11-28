import { Request, Response, Router } from 'express';
import { getDbContext } from '../Entity/Database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Mailer } from '../Email/mailer';
import { onlyOwner } from './Middleware/auth';

/**
 * @swagger
 * /api/auth/updateToken:
 *   post:
 *     summary: Updates the JWT token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       500:
 *         description: Something went wrong
 */
const updateTokenHandler = async (req: Request, res: Response) => {
  try {
    const token = jwt.sign(
      { id: req.body.userId, date: new Date().getTime() },
      process.env.JWT_SECRET!
    );
    res.json({ token: token });
  } catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong');
  }
};

/**
 * @swagger
 * /api/auth/forgotPassword/{email}:
 *   post:
 *     summary: Sends a password reset email if the email exists
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: The user's email
 *     responses:
 *       200:
 *         description: If email exists, a password reset email will be sent
 *       500:
 *         description: Something went wrong
 */
const forgotPasswordHandler = async (req: Request, res: Response) => {
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

    var toSign = { date: new Date().getTime(), id: user.id };
    var signed = jwt.sign(toSign, process.env.JWT_SECRET!);

    // send forgot password email
    new Mailer().sendForgotPasswordEmail(user.email, signed);
    res.status(200).send(message);
  } catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong');
  }
};

/**
 * @swagger
 * /api/auth/resetPassword/{signature}:
 *   post:
 *     summary: Resets the user's password
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: signature
 *         schema:
 *           type: string
 *         required: true
 *         description: The JWT signature for password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Expired link or invalid request
 *       404:
 *         description: User not found
 *       500:
 *         description: Something went wrong
 */
const resetPasswordHandler = async (req: Request, res: Response) => {
  try {
    // TODO: add nonce for password so a signature can only be used once.
    // Think a nonce in the db indicating how many passwords have been set ever.
    var { id, date } = jwt.verify(
      req.params.signature,
      process.env.JWT_SECRET!
    ) as { id: string; date: number };

    // 30 minutes
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
};

/**
 * @swagger
 * /api/auth/verify/{id}/{code}:
 *   get:
 *     summary: Verifies the user's email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The user's ID
 *       - in: path
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: The verification code
 *     responses:
 *       200:
 *         description: Verification successful
 *       400:
 *         description: Invalid verification code or user already verified
 *       404:
 *         description: User not found
 *       500:
 *         description: Something went wrong
 */
const verifyHandler = async (req: Request, res: Response) => {
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
    res.send('Verification successful! you can now close this tab and login.');
  } catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong');
  }
};

/**
 * @swagger
 * /api/auth/signIn:
 *   post:
 *     summary: Signs in the user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sign in successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 userId:
 *                   type: string
 *                 date:
 *                   type: number
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Something went wrong
 */
const signInHandler = async (req: Request, res: Response) => {
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
        const toSign = { id: user.id, date: new Date().getTime() };
        const token = jwt.sign(toSign, process.env.JWT_SECRET!);

        res.json({ token: token, userId: user.id, date: toSign.date });
      } else {
        res.status(401).send('Invalid email or password.');
      }
    }
  } catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong');
  }
};

/**
 * @swagger
 * /api/auth/signUp:
 *   post:
 *     summary: Signs up a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sign up successful
 *       400:
 *         description: Email is required, password is required, or user already exists
 *       500:
 *         description: Something went wrong
 */
const signUpHandler = async (req: Request, res: Response) => {
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
    res
      .status(200)
      .send(
        'A verification email has been sent to your email account. Please click the link in the email'
      );
  } catch (error) {
    console.log(error);
    res.status(500).send('Something went wrong');
  }
};

export function GetAuthRouter() {
  const authRouter = Router();

  authRouter.post('/api/auth/updateToken', onlyOwner, updateTokenHandler);

  authRouter.post('/api/auth/forgotPassword/:email', forgotPasswordHandler);

  authRouter.post('/api/auth/resetPassword/:signature', resetPasswordHandler);

  authRouter.get('/api/auth/verify/:id/:code', verifyHandler);

  authRouter.post('/api/auth/signIn', signInHandler);

  authRouter.post('/api/auth/signUp', signUpHandler);

  return authRouter;
}
