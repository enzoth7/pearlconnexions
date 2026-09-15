"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="card mx-auto mt-20 max-w-xl p-8 text-center"><h1 className="text-2xl font-bold">We could not load this page</h1><p className="mt-3 text-slate-600">Check the connection and try again.</p><button className="btn btn-primary mt-6" onClick={reset}>Try again</button></section>}
