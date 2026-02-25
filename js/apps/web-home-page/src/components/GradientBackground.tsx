/**
 * GradientBackground
 *
 * Fixed full-page layer of radial gradient blobs (indigo/violet, low opacity)
 * floating over the base background. Rendered once in the root layout so it
 * persists across all sections without repainting.
 *
 * z-index: -1 ensures blobs sit behind all page content.
 * pointer-events: none ensures it never captures clicks.
 */
export default function GradientBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Top-right — indigo */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.28)_0%,transparent_70%)] blur-[40px] animate-blob" />

      {/* Bottom-left — violet */}
      <div className="absolute bottom-[10%] left-[-8%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.22)_0%,transparent_70%)] blur-[50px] animate-blob-alt [animation-delay:-7s]" />

      {/* Centre — indigo/violet blend */}
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18)_0%,transparent_70%)] blur-[60px] animate-blob-slow [animation-delay:-13s]" />
    </div>
  );
}
