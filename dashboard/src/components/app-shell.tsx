import type { AccessContext } from "@/lib/auth";
import { WorkspaceNavigation } from "./workspace-navigation";

export function AppShell({ children, context }: { children: React.ReactNode; context: AccessContext }) {
  return (
    <WorkspaceNavigation name={context.name} qaRole={context.role} workbookRole={context.workbookRole}
      finance={context.finance} hr={context.hr} isAdmin={context.isAdmin}>
      {children}
    </WorkspaceNavigation>
  );
}

export function PageHeader({ title, action, titleClassName, titleStyle }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  titleClassName?: string;
  titleStyle?: React.CSSProperties;
}) {
  return (
    <header className="workspace-heading">
      <div>
        <h1 className={titleClassName} style={titleStyle}>{title}</h1>
      </div>
      {action}
    </header>
  );
}
