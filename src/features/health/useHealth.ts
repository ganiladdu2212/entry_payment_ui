import { useQuery } from '@tanstack/react-query';
import { getHealth } from './healthApi';
export function useHealth() { return useQuery({ queryKey: ['health'], queryFn: getHealth, enabled: false }); }
