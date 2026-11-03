import { describe, expect, it, vi, afterEach } from "vitest";
import { checklistScore, reportErrors, saveGovernance, recordSchema, type Question, type ReportBody } from "./governance";
import { organisationGroups } from "./organisation";
const questions: Question[] = [{code:"safety",section:3,label:"Checks complete?",provisions:[]}];
const body: ReportBody = {answers:{safety:{answer:"yes",note:""}},occupied_beds:"2.5",records_confirmed:true};
afterEach(()=>vi.unstubAllGlobals());
describe("checklist report",()=>{
 it("excludes not applicable and unanswered checks from the score",()=>{expect(checklistScore({a:{answer:"yes",note:""},b:{answer:"no",note:"pending"},c:{answer:"na",note:"not provided"},d:{answer:"",note:""}})).toBe(.5);});
 it("does not turn an empty or all-not-applicable checklist into a zero",()=>{expect(checklistScore({})).toBeNull();expect(checklistScore({a:{answer:"na",note:"not applicable"}})).toBeNull();});
 it("requires explanations, valid occupancy and a separate register confirmation",()=>{expect(reportErrors(body,questions,3)).toEqual([]);expect(reportErrors({...body,answers:{safety:{answer:"no",note:""}},records_confirmed:false,occupied_beds:"4"},questions,3)).toHaveLength(3);});
 it("allows genuine zero occupancy",()=>{expect(reportErrors({...body,occupied_beds:"0"},questions,3)).toEqual([]);});
 it("preserves a useful response when a session redirects to HTML",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("login",{headers:{"content-type":"text/html"}})));expect((await saveGovernance("/api/governance",{})).ok).toBe(false);});
 it("treats rejected JSON responses as failures",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json({ok:true,message:"ignored"},{status:403})));expect((await saveGovernance("/api/governance",{})).ok).toBe(false);});
});
describe("register validation",()=>{it("rejects states from another register",()=>{expect(recordSchema.safeParse({id:crypto.randomUUID(),home_id:crypto.randomUUID(),kind:"maintenance",title:"Broken tap",occurred_on:"2026-11-01",status:"Approved",data:{description:"Kitchen tap is broken",location:"Kitchen",category:"",priority:"High",owner:"",due_on:"",controls:"",action_taken:"",follow_up:"",checks:"",physical_intervention:false,reported_within_24h:false,workbook_action_id:""}}).success).toBe(false);});});
describe("organisation chart",()=>{it("keeps unset reporting lines separate and excludes hidden accounts",()=>{const result=organisationGroups([{id:"d",name:"Director",role_title:null,parent_manager_id:null,director:true},{id:"m",name:"Manager",role_title:null,parent_manager_id:null},{id:"h",name:"Hidden",role_title:null,parent_manager_id:null,include_in_org_chart:false},{id:"c",name:"Child",role_title:null,parent_manager_id:"h"}]);expect(result.roots.map(p=>p.id)).toEqual(["d"]);expect(result.unassigned.map(p=>p.id)).toEqual(["m","c"]);});});
