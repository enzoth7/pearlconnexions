import { supabase } from "./supabase";
import { navigate } from "./navigation";
import { privateCall } from "./private-call";
import { z } from "zod";
export type ActionState = { ok?: boolean; message?: string; errors?: Record<string,string[]>; version?: number };
export async function login(_prev:ActionState, form:FormData):Promise<ActionState>{const {error}=await supabase.auth.signInWithPassword({email:String(form.get("email")),password:String(form.get("password"))});if(error)return{message:error.message};navigate(String(form.get("next")||"/"));return{ok:true};}
export async function requestPasswordReset(_prev:ActionState, form:FormData):Promise<ActionState>{const {error}=await supabase.auth.resetPasswordForEmail(String(form.get("email")),{redirectTo:`${location.origin}/auth/callback?next=/update-password`});return error?{message:error.message}:{ok:true,message:"Check your email for a password reset link."};}
export async function updatePassword(_prev:ActionState, form:FormData):Promise<ActionState>{const password=String(form.get("password"));if(password!==String(form.get("confirm_password")))return{message:"Passwords do not match."};const {error}=await supabase.auth.updateUser({password});return error?{message:error.message}:{ok:true,message:"Password updated."};}
export async function saveDraft(_prev:ActionState,form:FormData):Promise<ActionState>{
  const id = z.uuid().safeParse(form.get("submission_id"));
  const version = Number(form.get("version"));
  const date = String(form.get("audit_date") || "");
  if (!id.success || !Number.isInteger(version) || version < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return {message:"Check the audit date and refresh the form."};
  const metrics = new Map<string,{metric_code:string;expected:number|null;actual:number|null}>();
  for(const [key,value] of form.entries()){
    const match=/^metric_([A-Za-z][A-Za-z0-9_]*)_(expected|actual)$/.exec(key);
    if(!match)continue;
    const row=metrics.get(match[1])??{metric_code:match[1],expected:null,actual:null};
    const raw=String(value).trim();
    const number=raw?Number(raw):null;
    if(number!==null&&(!Number.isFinite(number)||number<0))return{message:"Check the metric values."};
    row[match[2] as "expected"|"actual"]=number;metrics.set(match[1],row);
  }
  let incidents:unknown[];
  try { incidents=JSON.parse(String(form.get("incident_entries")||"[]"));if(!Array.isArray(incidents)||incidents.length>100)throw new Error(); } catch{return{message:"Check the incident records."};}
  const {data,error}=await supabase.rpc("qa_save_draft",{target_submission_id:id.data,expected_version:version,target_audit_date:date,entries:[...metrics.values()],incident_entries:incidents});
  if(error)return{message:error.message};window.dispatchEvent(new Event("pearl:refresh"));return{ok:true,message:"Draft saved.",version:Number(data)} as ActionState;
}
export async function submitSubmission(_prev:ActionState,form:FormData):Promise<ActionState>{
  const id=z.uuid().safeParse(form.get("submission_id"));const version=Number(form.get("version"));
  if(!id.success||!Number.isInteger(version)||version<1)return{message:"Refresh the form before submitting."};
  const {error}=await supabase.rpc("qa_submit_submission",{target_submission_id:id.data,expected_version:version});
  if(error)return{message:error.message};window.dispatchEvent(new Event("pearl:refresh"));return{ok:true,message:"Report submitted and locked."};
}
export async function inviteMember(_prev:ActionState,form:FormData):Promise<ActionState>{return privateCall("invite-member", form);}
export async function approveSubmission(form:FormData):Promise<void>{const id=z.uuid().parse(form.get("submission_id"));const {error}=await supabase.rpc("qa_approve_submission",{target_submission_id:id});if(error){window.alert(error.message);return;}window.dispatchEvent(new Event("pearl:refresh"));}
export async function reopenSubmission(form:FormData):Promise<void>{const id=z.uuid().parse(form.get("submission_id"));const reason=String(form.get("reason")||"").trim();if(reason.length<5){window.alert("Add a reason for returning the report.");return;}const {error}=await supabase.rpc("qa_reopen_submission",{target_submission_id:id,reason});if(error){window.alert(error.message);return;}window.dispatchEvent(new Event("pearl:refresh"));}
