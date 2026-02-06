import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiGoogle } from "react-icons/si";
import { GraduationCap, TrendingUp, Users, Calendar } from "lucide-react";

export default function Login() {
    const handleLogin = () => {
        window.location.href = "/auth/google";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
                {/* Left side - Branding & Features */}
                <div className="hidden lg:block space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg">
                                <GraduationCap className="h-8 w-8 text-white" />
                            </div>
                            <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                TutorTrack
                            </h1>
                        </div>
                        <p className="text-xl text-slate-600 font-medium">
                            The modern way to manage your tutoring business
                        </p>
                    </div>

                    <div className="space-y-4">
                        <FeatureItem
                            icon={<Users className="h-5 w-5" />}
                            title="Student Management"
                            description="Track student progress, contact info, and payment history"
                        />
                        <FeatureItem
                            icon={<Calendar className="h-5 w-5" />}
                            title="Class Tracking"
                            description="Log sessions, durations, and automatically notify parents"
                        />
                        <FeatureItem
                            icon={<TrendingUp className="h-5 w-5" />}
                            title="Earnings Dashboard"
                            description="Monitor your income and outstanding payments at a glance"
                        />
                    </div>
                </div>

                {/* Right side - Login Card */}
                <Card className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-xl shadow-2xl border-none">
                    <CardContent className="p-8 sm:p-12">
                        {/* Mobile logo */}
                        <div className="lg:hidden mb-8 text-center">
                            <div className="inline-flex items-center gap-2 mb-2">
                                <div className="bg-gradient-to-br from-blue-600 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center">
                                    <GraduationCap className="h-6 w-6 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold font-display bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    TutorTrack
                                </h1>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="text-center lg:text-left space-y-2">
                                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
                                    Welcome back
                                </h2>
                                <p className="text-slate-500">
                                    Sign in to access your tutoring dashboard
                                </p>
                            </div>

                            <div className="space-y-4">
                                <Button
                                    className="w-full h-12 text-base font-medium bg-white hover:bg-gray-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 shadow-sm transition-all hover:shadow-md"
                                    size="lg"
                                    onClick={handleLogin}
                                >
                                    <SiGoogle className="mr-3 h-5 w-5 text-[#4285F4]" />
                                    Continue with Google
                                </Button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-slate-400">Secure Authentication</span>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                    <p className="text-xs text-slate-600 text-center">
                                        🔒 Your data is protected with industry-standard OAuth 2.0 encryption
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 text-center text-xs text-slate-400">
                                <p>
                                    By signing in, you agree to our Terms of Service and Privacy Policy
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex gap-4 items-start">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600">
                {icon}
            </div>
            <div>
                <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
                <p className="text-sm text-slate-600">{description}</p>
            </div>
        </div>
    );
}
