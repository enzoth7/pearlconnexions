import { requireGovernance } from "@/lib/auth";
import { QaHomesTable } from "@/components/qa-homes-table";
import type { Home } from "@/lib/types";
export default async function Page(){
 const {context,supabase}=await requireGovernance("qa", "qa.homes");
 const [homes,members]=await Promise.all([supabase.from("qa_homes").select("*").order("name"),supabase.from("qa_members").select("display_name,qa_member_homes(home_id)").eq("active",true)]);
 if(homes.error||members.error)throw new Error(homes.error?.message||members.error?.message);
 const visible=(homes.data as Home[]).filter(home=>context.role==="director"||context.homes.some(h=>h.id===home.id));
 return <QaHomesTable director={context.role==="director"} homes={visible.map(home=>({...home,managers:members.data.filter(member=>member.qa_member_homes.some(a=>a.home_id===home.id)).map(member=>member.display_name)}))}/>;
}
