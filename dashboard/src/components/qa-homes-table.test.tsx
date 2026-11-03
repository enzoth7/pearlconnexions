import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {afterEach,describe,expect,it,vi} from "vitest";
import {QaHomesTable} from "./qa-homes-table";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
afterEach(cleanup);
const homes=[{id:"1",code:"CH1",name:"First home",provision:"Supported Living" as const,total_beds:3,active:true,managers:["Alice"]},{id:"2",code:"CH2",name:"Second home",provision:"Children's Home" as const,total_beds:4,active:false,managers:["Bob"]}];
describe("Homes table",()=>{
 it("filters homes by manager name and service",()=>{render(<QaHomesTable homes={homes} director/>);fireEvent.change(screen.getByLabelText("Search"),{target:{value:"Bob"}});expect(screen.queryByText("First home")).not.toBeInTheDocument();expect(screen.getByText("Bob")).toBeInTheDocument();fireEvent.change(screen.getByLabelText("Service"),{target:{value:"Supported Living"}});expect(screen.getByText("No assigned homes match these filters.")).toBeInTheDocument();});
 it("offers managers a read-only table",()=>{render(<QaHomesTable homes={homes.slice(0,1)} director={false}/>);expect(screen.getByRole("table")).toBeInTheDocument();expect(screen.queryByRole("button",{name:/Edit/})).not.toBeInTheDocument();});
});
