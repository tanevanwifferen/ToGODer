import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

export const authenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.headers.authorization) return res.status(401).json('Unauthorized');

    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET!);
    next();
  } catch {
    res.status(401).json({ logout: true });
  }
};

const onlyOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.headers.authorization) return res.status(401).json('Unauthorized');

    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = <{ id: string }>(
      jwt.verify(token, process.env.JWT_SECRET!)
    );
    if (decodedToken.id === req.params.id) {
      next();
    } else {
      res.status(401).json('nope');
    }
  } catch {
    res.status(401).json('Unauthorized');
  }
};
