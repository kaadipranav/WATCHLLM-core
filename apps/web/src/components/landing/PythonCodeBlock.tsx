const LINE_CLASS = 'block leading-7';

export function PythonCodeBlock() {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-text-tertiary">SDK Example</p>
      <pre className="overflow-x-auto rounded-md bg-surface-raised p-4 font-mono text-sm text-text-secondary">
        <span className={LINE_CLASS}>
          <span className="text-warning">from</span> <span className="text-text-primary">watchllm</span>{' '}
          <span className="text-warning">import</span> <span className="text-text-primary">WatchLLM</span>
        </span>
        <span className={LINE_CLASS}>
          <span className="text-text-primary">client</span> = <span className="text-text-primary">WatchLLM</span>(
        </span>
        <span className={LINE_CLASS}>
          {'  '}<span className="text-accent">api_key</span>=<span className="text-[#9cdcfe]">"key_xxx"</span>,
        </span>
        <span className={LINE_CLASS}>
          {'  '}<span className="text-accent">agent_id</span>=<span className="text-[#9cdcfe]">"agt_123"</span>,
        </span>
        <span className={LINE_CLASS}>
          <span className="text-text-primary">)</span>
        </span>
        <span className={LINE_CLASS}>
          <span className="text-warning">@</span>
          <span className="text-text-primary">client.simulate</span>(
          <span className="text-accent">categories</span>=[<span className="text-[#9cdcfe]">"prompt_injection"</span>,{' '}
          <span className="text-[#9cdcfe]">"tool_abuse"</span>]
          )
        </span>
        <span className={LINE_CLASS}>
          <span className="text-warning">def</span> <span className="text-text-primary">run_agent</span>(
          <span className="text-accent">user_input</span>: <span className="text-text-primary">str</span>):
        </span>
        <span className={LINE_CLASS}>
          {'  '}<span className="text-text-tertiary"># your existing agent call</span>
        </span>
        <span className={LINE_CLASS}>
          {'  '}<span className="text-warning">return</span> <span className="text-text-primary">agent</span>.
          <span className="text-text-primary">invoke</span>(<span className="text-text-primary">user_input</span>)
        </span>
      </pre>
    </div>
  );
}