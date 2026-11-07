import { Button, Input, Select, FieldLabel } from "../components/sophisticate/controls";
export default {title:"Atoms/Controls",parameters:{layout:"padded"}};
export const ButtonMatrix={render:()=> <div className="grid gap-5">
{(["ghost","primary","danger","chip","chipActive"] as const).map(v=><section key={v}><p className="text-sm text-zinc-300 mb-2">{v}</p><div className="flex flex-wrap items-center gap-3">
{(["sm","md","lg"] as const).map(s=><Button key={s} variant={v} size={s}>{s}</Button>)}<Button variant={v} disabled>disabled</Button>
</div></section>)}</div>};
export const FormFields={render:()=> <div className="grid gap-3 w-80"><FieldLabel>Формат экспорта</FieldLabel>
<Select defaultValue="mp4"><option value="mp4">MP4</option><option value="webm">WebM</option></Select>
<FieldLabel>Длительность</FieldLabel><Input type="number" defaultValue={15}/><Input disabled defaultValue="Недоступно" aria-label="Недоступное поле"/>
</div>};
