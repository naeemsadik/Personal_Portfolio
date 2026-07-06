import { listMessages } from '@/lib/content/read';
import { MessagesAdmin } from './MessagesAdmin';

export default async function AdminMessagesPage() {
  const messages = await listMessages();
  return <MessagesAdmin initial={messages} />;
}
