import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import CustomValuesClient from './CustomValuesClient';

interface CustomValuesPageProps {
  params: Promise<{
    locationId: string;
  }>;
}

export async function generateMetadata(props: CustomValuesPageProps): Promise<Metadata> {
  const { locationId } = await props.params;
  const decodedId = decodeURIComponent(locationId);

  return {
    title: `Custom values for ${decodedId}`,
    description: `Inspect all custom values available on the Go High Level sub-account ${decodedId}.`,
  };
}

export default async function CustomValuesPage(props: CustomValuesPageProps) {
  const { locationId } = await props.params;
  const decodedId = decodeURIComponent(locationId);

  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />
      <CustomValuesClient locationId={decodedId} />
    </main>
  );
}
