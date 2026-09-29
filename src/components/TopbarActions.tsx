import { Button } from "@/components/ui/button";

interface Props {
  signedIn: boolean;
  email: string;
}

export default function TopbarActions({ signedIn, email }: Props) {
  if (!signedIn) {
    return (
      <>
        <span className="text-muted-foreground">Not signed in</span>
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <a href="/auth/signin">Sign in</a>
          </Button>
          <Button variant="ghost" asChild>
            <a href="/auth/signup">Sign up</a>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <span className="text-muted-foreground">{email}</span>
      <div className="flex items-center gap-3">
        <Button variant="ghost" asChild>
          <a href="/dashboard">Dashboard</a>
        </Button>
        <form method="POST" action="/api/auth/signout">
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}
