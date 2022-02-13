import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackUI: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallbackUI;
    }

    return this.props.children;
  }
}
