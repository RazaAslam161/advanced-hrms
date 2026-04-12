import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { ErrorState } from './AsyncState';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorState label="This page hit an unexpected problem. Refreshing the route usually recovers it." />;
    }

    return this.props.children;
  }
}
