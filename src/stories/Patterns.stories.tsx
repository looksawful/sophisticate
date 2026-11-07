import { Button,FieldLabel,Input,Select } from "../components/sophisticate/controls";
import { ProcessingOverlay } from "../components/sophisticate/ProcessingOverlay";
export default {title:"Patterns/Export flow",parameters:{layout:"padded"}};
export const Settings={render:()=> <div className="grid gap-3 w-80 p-5 rounded-2xl bg-zinc-950 border border-zinc-800"><FieldLabel>Экспорт</FieldLabel>
<Select defaultValue="mp4"><option value="mp4">MP4</option><option value="webm">WebM</option></Select>
<FieldLabel>Скорость</FieldLabel><Input type="number" defaultValue={1} step={0.1}/><Button variant="primary">Экспортировать</Button></div>};
export const Exporting={render:()=> <div style={{width:460,maxWidth:"90vw"}}><ProcessingOverlay progress={0.57} prefersReducedMotion/></div>};
