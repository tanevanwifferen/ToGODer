import { Router } from 'express';
import { authenticated, setAuthUser } from './Middleware/auth';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { BillingApi } from '../Api/BillingApi';
import { ToGODerRequest } from './Model/ToGODerRequest';

export function GetBillingRouter(
  messageLimiter: RateLimitRequestHandler
): Router {
  var router = Router();

  router.get(
    '/api/billing',
    authenticated,
    messageLimiter,
    setAuthUser,
    async (req, res) => {
      var billingApi = new BillingApi();
      var r = req as ToGODerRequest;
      var balance = await billingApi.GetBalance(r.togoder_auth!.user!.email);
      res.json({ balance: balance });
    }
  );

  return router;
}
