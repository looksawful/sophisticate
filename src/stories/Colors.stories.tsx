const palette=["bg-zinc-950","bg-zinc-900","bg-zinc-800","bg-zinc-700","bg-pink-600","bg-pink-500","bg-red-600"];
export default {title:"Foundations/Colors",parameters:{layout:"padded"}};
export const Swatches={render:()=> <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
{palette.map(token=><div key={token} className="border border-zinc-700 rounded-xl overflow-hidden"><div className={token} style={{height:90}}/><p className="px-3 py-2 text-zinc-300 text-xs">{token}</p></div>)}</div>};
