import { useQuery } from '@tanstack/react-query';
import { getCustomerSubscriptions } from './subscriptionApi';

export function useCustomerSubscriptions(custId?: number) {
  return useQuery({
    queryKey: ['customer-subscriptions', custId],
    queryFn: () => getCustomerSubscriptions(custId!),
    enabled: typeof custId === 'number',
  });
}
