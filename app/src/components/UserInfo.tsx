import { UserPayload } from '@/lib/auth';
import LogoutButton from './LogoutButton';

interface UserInfoProps {
  user: UserPayload;
}

export default function UserInfo({ user }: UserInfoProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Informações do Usuário</h2>
      <div className="space-y-3">
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">Nome:</span>{' '}
          <span className="text-gray-900 dark:text-white">{user.nome}</span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">Email:</span>{' '}
          <span className="text-gray-900 dark:text-white">{user.email}</span>
        </div>
        <div>
          <span className="font-medium text-gray-500 dark:text-gray-400">Função:</span>{' '}
          <span className="text-gray-900 dark:text-white">{user.role}</span>
        </div>
        <div className="pt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
