import { cookies } from 'next/headers';
import { login, logout } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const error = typeof searchParams.error === 'string' ? searchParams.error : null;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('admin-session')?.value;
    
    // NEW STATELESS SESSION VALIDATION
    const isLoggedIn = sessionId === 'authenticated';

    // If not logged in, show login form
    if (!isLoggedIn) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center">Admin Login</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error === 'invalid' && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4 text-center">
                                Invalid email or password
                            </div>
                        )}
                        {error === 'ratelimited' && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4 text-center">
                                Too many login attempts. Please try again later.
                            </div>
                        )}
                        {error === 'server_error' && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4 text-center">
                                Server error. Please try again.
                            </div>
                        )}
                        <form action={login} className="space-y-4">
                            <Input
                                type="email"
                                name="email"
                                placeholder="Enter admin email"
                                required
                            />
                            <Input
                                type="password"
                                name="password"
                                placeholder="Enter admin password"
                                required
                            />
                            <Button type="submit" className="w-full">
                                Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Fetch feedback data (Disabled due to Redis removal)
    let feedbackList: any[] = [];

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Feedback Dashboard</h1>
                <form action={logout}>
                    <Button variant="outline">Logout</Button>
                </form>
            </div>

            <div className="grid gap-6">
                {feedbackList.length === 0 ? (
                    <p className="text-muted-foreground text-center py-10">No feedback entries found.</p>
                ) : (
                    feedbackList.map((feedback, index) => (
                        <Card key={index}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {new Date(feedback.timestamp).toLocaleString()}
                                </CardTitle>
                                <span className="text-xs text-muted-foreground font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    {feedback.type.toUpperCase()}
                                </span>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap mt-2">{feedback.message}</p>
                                {feedback.email && (
                                    <p className="text-xs text-muted-foreground mt-4">
                                        Contact: {feedback.email}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}