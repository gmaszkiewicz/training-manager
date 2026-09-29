import { Button } from "@/components/ui/button";

interface Props {
  signedIn: boolean;
}

export default function HomeActions({ signedIn }: Props) {
  if (signedIn) {
    return null;
  }

  return (
    <>
      <Button variant="default" asChild>
        <a href="/auth/signin">Sign in</a>
      </Button>
      <Button variant="outline" asChild>
        <a href="/auth/signup">Sign up</a>
      </Button>
    </>
  );
}
