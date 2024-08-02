import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getDbContext } from '../../Entity/Database';
import { ToGODerAuth } from '../Model/ToGODerRequest';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

export const setAuthUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth: ToGODerAuth = {
      user: null,
    };
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const { id } = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const db = getDbContext();
      auth.user = await db.user.findUnique({ where: { id } });
    }
    Object.defineProperty(req, 'togoder_auth', {
      value: auth,
    });
    next();
  } catch (e) {
    res.status(401).json('Invalid token');
  }
};
export const authenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.headers.authorization) return res.status(401).json('Unauthorized');

    const token = req.headers.authorization.split(' ')[1];
    const { id, date } = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      date: number;
    };

    if (date < new Date().getTime() - 1000 * 60 * 60 * 24) {
      return res.status(401).json('Token expired');
    }

    next();
  } catch {
    res.status(401).json({ logout: true });
  }
};

export const onlyOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.headers.authorization) return res.status(401).json('Unauthorized');

    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = <{ id: string; date: number }>(
      jwt.verify(token, process.env.JWT_SECRET!)
    );
    if (
      decodedToken.id === req.params.id &&
      decodedToken.date > new Date().getTime() - 1000 * 60 * 60 * 24
    ) {
      next();
    } else {
      res.status(401).json('nope');
    }
  } catch {
    res.status(401).json('Unauthorized');
  }
};
