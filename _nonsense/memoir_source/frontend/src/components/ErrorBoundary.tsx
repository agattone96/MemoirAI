import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white/50 rounded-xl border border-red-100">
                    <div className="col-span-12 lg:col-span-5 p-6 rounded-2xl border border-red-200 shadow-sm bg-red-50 max-w-lg">
                        <div className="flex flex-col items-center">
                            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                            <h2 className="text-xl font-bold text-red-900 mb-2">Something went wrong</h2>
                            <p className="text-red-700 text-sm mb-6">
                                {this.state.error?.message || "An unexpected error occurred while rendering this component."}
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-semibold text-sm"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Reload Application
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
