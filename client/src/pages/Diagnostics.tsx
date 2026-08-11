import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DownloadCloud, UploadCloud, History, ArrowRight } from "lucide-react";

export default function HomePage() {
    return (
        <div className="space-y-12">
            <div className="text-center space-y-4 py-12">
                <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    TR-143 Diagnostics
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Comprehensive throughput performance testing for CPE devices.
                    Simulate standard-compliant download and upload scenarios.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/download">
                    <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer group border-border/60">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                                <DownloadCloud className="w-6 h-6" />
                            </div>
                            <CardTitle>Download Test</CardTitle>
                            <CardDescription>
                                Measure HTTP download throughput, response times, and stability.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                                Configure Test <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/upload">
                    <Card className="h-full hover:shadow-lg hover:border-accent/50 transition-all duration-300 cursor-pointer group border-border/60">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <CardTitle>Upload Test</CardTitle>
                            <CardDescription>
                                Test upstream capacity with configurable file sizes and connection concurrency.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm font-medium text-accent group-hover:translate-x-1 transition-transform">
                                Configure Test <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/history">
                    <Card className="h-full hover:shadow-lg hover:border-purple-500/50 transition-all duration-300 cursor-pointer group border-border/60">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                                <History className="w-6 h-6" />
                            </div>
                            <CardTitle>Test History</CardTitle>
                            <CardDescription>
                                View past results, analyze throughput trends, and export diagnostic logs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm font-medium text-purple-600 group-hover:translate-x-1 transition-transform">
                                View Logs <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
