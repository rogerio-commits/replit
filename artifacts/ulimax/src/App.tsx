import { lazy, Suspense, useEffect, useRef, type ReactNode } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

import { Layout } from "@/components/layout";
import { useAppUser } from "@/hooks/useAppUser";
import { useEffectiveRole } from "@/hooks/useViewAs";
import { canAccessRoute, homeForRole } from "@/lib/access";

// Páginas de entrada (públicas e leves) ficam no bundle inicial.
import Landing from "@/pages/landing";
import NotFound from "@/pages/not-found";

// As páginas autenticadas viram chunks sob demanda: cada rota só baixa o seu
// código quando é visitada. Isso tira do carregamento inicial bibliotecas
// pesadas e específicas de página (jspdf/html2canvas no relatório, @uppy nos
// anexos, @dnd-kit no kanban, react-markdown no assistente).
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Projects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const Members = lazy(() => import("@/pages/members"));
const Trabalho = lazy(() => import("@/pages/kanban"));
const Calendario = lazy(() => import("@/pages/calendario"));
const Checklist = lazy(() => import("@/pages/checklist"));
const Ajuda = lazy(() => import("@/pages/ajuda"));
const Audit = lazy(() => import("@/pages/audit"));
const MeuDia = lazy(() => import("@/pages/meu-dia"));
const Templates = lazy(() => import("@/pages/templates"));
const Automacao = lazy(() => import("@/pages/automacao"));
const Obra = lazy(() => import("@/pages/obra"));
const CamposPersonalizados = lazy(() => import("@/pages/campos-personalizados"));
const Reuniao = lazy(() => import("@/pages/reuniao"));
const Desempenho = lazy(() => import("@/pages/desempenho"));
const Assistente = lazy(() => import("@/pages/assistente"));
const RelatorioProjeto = lazy(() => import("@/pages/relatorio-projeto"));
const Prancheta = lazy(() => import("@/pages/prancheta"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(24, 100%, 50%)",
    colorForeground: "hsl(240, 10%, 10%)",
    colorMutedForeground: "hsl(240, 5%, 45%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 98%)",
    colorInput: "hsl(240, 6%, 90%)",
    colorInputForeground: "hsl(240, 10%, 10%)",
    colorNeutral: "hsl(240, 6%, 90%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.375rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-xl w-[440px] max-w-full overflow-hidden shadow-lg border border-gray-100",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium text-sm",
    footerActionLink: "text-primary font-semibold hover:text-primary/80",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-sm",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-emerald-600",
    alertText: "text-foreground text-sm",
    logoBox: "flex justify-center mb-1",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border border-gray-200 bg-white hover:bg-gray-50 text-foreground",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm",
    formFieldInput: "border-gray-200 bg-white text-foreground focus:border-primary focus:ring-primary/20",
    footerAction: "bg-gray-50 border-t border-gray-100",
    dividerLine: "bg-gray-200",
    alert: "bg-red-50 border-red-200",
    otpCodeFieldInput: "border-gray-200 bg-white text-foreground",
    formFieldRow: "",
    main: "",
  },
};

function ClerkAuthTokenBridge() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
    return () => {
      setAuthTokenGetter(null);
    };
  }, [isSignedIn, getToken]);

  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-orange-50/50 px-4 py-8">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-orange-50/50 px-4 py-8">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function RoleLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function RoleHome() {
  const { isLoading } = useAppUser();
  const role = useEffectiveRole();
  if (isLoading) return <RoleLoading />;
  // Se o perfil não carregar (erro), cai no dashboard — os dados continuam protegidos pelo servidor
  return <Redirect to={homeForRole(role ?? "gestor")} replace />;
}

function RoleGate({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: me, isLoading } = useAppUser();
  const role = useEffectiveRole();
  if (isLoading) return <RoleLoading />;
  if (me && !canAccessRoute(role, location)) {
    return <Redirect to={homeForRole(role)} replace />;
  }
  return <>{children}</>;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <RoleHome />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoutes() {
  const [, navigate] = useLocation();
  useKeyboardShortcuts(navigate);
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <RoleGate>
          <Suspense fallback={<RoleLoading />}>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/:id/relatorio" component={RelatorioProjeto} />
            <Route path="/projects/:id" component={ProjectDetail} />
            <Route path="/tasks" component={Trabalho} />
            <Route path="/kanban"><Redirect to="/tasks?tab=quadro" replace /></Route>
            <Route path="/members" component={Members} />
            <Route path="/calendario" component={Calendario} />
            <Route path="/alertas"><Redirect to="/dashboard" replace /></Route>
            <Route path="/checklist" component={Checklist} />
            <Route path="/assistencia-tecnica"><Redirect to="/obra" replace /></Route>
            <Route path="/controle-amostras"><Redirect to="/obra" replace /></Route>
            <Route path="/produtividade"><Redirect to="/projects" replace /></Route>
            <Route path="/gantt"><Redirect to="/tasks?tab=linha" replace /></Route>
            <Route path="/auditoria" component={Audit} />
            <Route path="/meu-dia" component={MeuDia} />
            <Route path="/prancheta" component={Prancheta} />
            <Route path="/templates" component={Templates} />
            <Route path="/ajuda" component={Ajuda} />
            <Route path="/automacao" component={Automacao} />
            <Route path="/portfolio"><Redirect to="/projects" replace /></Route>
            <Route path="/obra" component={Obra} />
            <Route path="/cobrancas"><Redirect to="/obra?tab=pendencias" replace /></Route>
            <Route path="/agenda"><Redirect to="/obra?tab=agenda" replace /></Route>
            <Route path="/painel-obra"><Redirect to="/obra" replace /></Route>
            <Route path="/reuniao" component={Reuniao} />
            <Route path="/desempenho" component={Desempenho} />
            <Route path="/assistente" component={Assistente} />
            <Route path="/campos-personalizados" component={CamposPersonalizados} />
            <Route path="/access"><Redirect to="/members" /></Route>
            <Route component={NotFound} />
          </Switch>
          </Suspense>
          </RoleGate>
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route component={ProtectedRoutes} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Bem-vindo de volta",
            subtitle: "Entre na sua conta para continuar",
          },
        },
        signUp: {
          start: {
            title: "Criar conta",
            subtitle: "Comece a gerenciar seus projetos hoje",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkAuthTokenBridge />
          <ClerkQueryClientCacheInvalidator />
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
