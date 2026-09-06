import { LoadingState } from '@/components/shared/LoadingState';

export default function Loading() {
  return <LoadingState stage="loading" message="Loading your profile..." />;
}
