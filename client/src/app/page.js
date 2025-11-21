import { redirect } from 'next/navigation';

export default function HomePage() {
    redirect('/sjsu'); // redirect anyone visiting '/' to '/sjsu'
}
