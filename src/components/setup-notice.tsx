export function envReady() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-amber-300 bg-amber-50 p-6">
      <h2 className="mb-2 text-base font-semibold text-amber-900">
        Supabase is not configured yet
      </h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-amber-800">
        <li>
          Create a free project at{" "}
          <span className="font-mono">supabase.com</span>
        </li>
        <li>
          Run the SQL files in <span className="font-mono">
            supabase/migrations
          </span>{" "}
          (0001, then 0002) in the SQL Editor
        </li>
        <li>
          Copy <span className="font-mono">.env.local.example</span> to{" "}
          <span className="font-mono">.env.local</span> and fill in your project
          URL and anon key
        </li>
        <li>Restart the dev server</li>
      </ol>
    </div>
  );
}

export function QueryError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
      <p className="font-semibold">Could not load data</p>
      <p className="mt-1 font-mono text-xs">{message}</p>
      <p className="mt-2">
        If tables are missing, run the SQL files in{" "}
        <span className="font-mono">supabase/migrations</span> (0001, then
        0002) in the Supabase SQL Editor.
      </p>
    </div>
  );
}
