import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';
const out = 'C:/Ganesh/Entry_Payment/entry_payment_ui/outputs/gym-import-20261007';
const wb = Workbook.create();
const members = wb.worksheets.add('Members');
const plans = wb.worksheets.add('Plans');
const guide = wb.worksheets.add('Instructions');
const headers = ['Gym Name','Branch Name','Member Name','Country Code','Mobile Number','Membership Plan','Personal Training Plan','Membership Start Date','Membership End Date','Training Start Date','Training End Date','Discount Type','Discount Value','Payment Mode','Payment Status','Amount Paid (INR)','Payment Date','Transaction Reference','Notes'];
const planHeaders = ['Gym Name','Branch Name','Plan Name','Plan Type','Duration Value','Duration Unit','Plan Price (INR)','Currency'];
function base(sh, last, rows) {
  sh.showGridLines = false;
  sh.getRange(`A1:${last}${rows}`).format.font = {name:'Arial',size:11,color:'#213547'};
  sh.getRange(`A1:${last}${rows}`).format.rowHeight = 26;
  sh.getRange(`A1:${last}${rows}`).format.columnWidth = 23;
  sh.getRange(`A1:${last}${rows}`).format.verticalAlignment = 'center';
}
function table(sh, hs, last, rows, name) {
  base(sh,last,rows);
  sh.getRange(`A1:${last}1`).values = [hs];
  sh.tables.add(`A1:${last}${rows}`,true,name);
  sh.getRange(`A1:${last}1`).format = {fill:'#13354B',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:44};
  sh.getRange(`A2:${last}${rows}`).format.fill = '#FFFBEF';
  sh.freezePanes.freezeRows(1);
}
table(members,headers,'S',201,'MemberData');
table(plans,planHeaders,'H',51,'PlanData');
members.tabColor='#13354B';
plans.tabColor='#7797A6';
guide.tabColor='#A8ADB4';
members.getRange('C1:C201').format.columnWidth=28;
members.getRange('F1:G201').format.columnWidth=30;
members.getRange('R1:S201').format.columnWidth=30;
members.getRange('D2:E201').setNumberFormat('@');
members.getRange('R2:R201').setNumberFormat('@');
for(const col of ['H','I','J','K','Q']) members.getRange(`${col}2:${col}201`).setNumberFormat('yyyy-mm-dd');
for(const col of ['M','P']) members.getRange(`${col}2:${col}201`).setNumberFormat('0.00');
function list(sh,range,values) { sh.getRange(range).dataValidation={rule:{type:'list',values}}; }
list(members,'L2:L201',['PERCENTAGE','FIXED_AMOUNT']);
list(members,'N2:N201',['UPI','CASH','CARD']);
list(members,'O2:O201',['RECEIVED','PENDING','ENQUIRED']);
list(plans,'D2:D51',['MEMBERSHIP','PERSONAL_TRAINING']);
list(plans,'F2:F51',['DAY','WEEK','MONTH','YEAR']);
list(plans,'H2:H51',['INR']);
plans.getRange('E2:E51').dataValidation={rule:{type:'whole',operator:'between',formula1:1,formula2:1000}};
plans.getRange('G2:G51').dataValidation={rule:{type:'whole',operator:'greaterThanOrEqual',formula1:0}};
plans.getRange('G2:G51').setNumberFormat('0');
members.getRange('E2:E201').conditionalFormats.addCustom('AND($E2<>"",COUNTIFS($A$2:$A$201,$A2,$E$2:$E$201,$E2)>1)',{fill:'#FDE8E7',font:{color:'#A4262C'}});
members.getRange('I2:I201').conditionalFormats.addCustom('AND(ISNUMBER($H2),ISNUMBER($I2),$I2<$H2)',{fill:'#FDE8E7',font:{color:'#A4262C'}});
members.getRange('M2:M201').conditionalFormats.addCustom('AND(ISNUMBER($M2),OR($M2<0,AND($L2="PERCENTAGE",$M2>100)))',{fill:'#FDE8E7',font:{color:'#A4262C'}});
base(guide,'D',52);
guide.getRange('A1:D52').format.fill='#FFFFFF';
guide.getRange('A1:A52').format.columnWidth=30;
guide.getRange('B1:B52').format.columnWidth=21;
guide.getRange('C1:C52').format.columnWidth=69;
guide.getRange('D1:D52').format.columnWidth=31;
guide.getRange('A2').values=[['Gym member data template']];
guide.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#13354B'};
const instructions = [
 ['Start here','Fill Members and Plans. Examples below are fictional; do not copy them as real members.'],
 ['One row per member','Enter the latest membership only. Use one workbook per gym organization; identify its branch on every row.'],
 ['Keep the structure','Do not rename sheets or headings, merge cells, or enter totals. Start at row 2. Save as .xlsx.'],
 ['Blank versus zero','Leave optional unknown details blank. Enter 0 only when the value is genuinely zero.'],
 ['Mobile numbers','Use digits only, no spaces or +91 in Mobile Number. Put +91 separately in Country Code.'],
 ['Avoid duplicates','One mobile number per gym organization, even across branches. Existing members must be matched before any insert.'],
 ['Plans first','List each distinct plan in Plans. Repeat its exact Plan Name in Members; prices are rupees, not paise.'],
 ['Dates','Enter real Excel dates displayed as yyyy-mm-dd. End Date means the last valid day, inclusive.'],
 ['Training','Leave training fields blank if none. Training must fit entirely within the membership dates.'],
 ['Payment status','RECEIVED = fully paid; PENDING = unpaid/part-paid; ENQUIRED = enquiry only, not an active membership.'],
 ['Enquiries','Enter the proposed membership plan, but leave membership/training dates blank until confirmed.'],
 ['Payment evidence','For RECEIVED, supply amount and payment date. Add UPI/card reference when available; never invent a reference.'],
 ['Privacy','Do not include passwords, UPI PINs, Aadhaar, card numbers or bank login details.'],
 ['Template capacity','Prepared for 200 members and 50 plans. Request an expanded file if more rows are needed.'],
 ['Before database import','Return the filled workbook for validation and a preview. No database records are changed by this file.'],
 ['Import compatibility','Historical dates, paid amounts, references and branch mapping need migration handling; the current registration API does not accept all of them.']
];
instructions.forEach(([label,txt],i)=>{const r=i+4;guide.getRange(`A${r}`).values=[[label]];guide.getRange(`B${r}`).values=[[txt]];guide.getRange(`B${r}:D${r}`).merge();guide.getRange(`B${r}:D${r}`).format.wrapText=true;guide.getRange(`A${r}:D${r}`).format.rowHeight=36;guide.getRange(`A${r}`).format.font.bold=true;});
guide.getRange('A21:D21').values=[['Member field','Required?','How to fill','Fictional example']];
const defs=[
 ['Gym Name','Yes','Exact organization name, identical on every row.','Sample Fitness'],
 ['Branch Name','Yes','Exact branch name; use Main only if that is the actual branch name.','Main'],
 ['Member Name','Yes','Full name; maximum 150 characters.','Sample Member'],
 ['Country Code','Yes','Text starting with +; India is +91.','+91'],
 ['Mobile Number','Yes','Text; API allows 6–15 digits. Indian mobile numbers should have 10 digits.','9000000001'],
 ['Membership Plan','Yes','Exact MEMBERSHIP Plan Name from Plans, including for an enquiry.','Monthly Membership'],
 ['Personal Training Plan','Optional','Exact PERSONAL_TRAINING Plan Name from Plans; blank if none.',''],
 ['Membership Start Date','Unless ENQUIRED','Actual start of the latest membership; do not substitute today.',''],
 ['Membership End Date','Unless ENQUIRED','Last valid day, inclusive. Must agree with the plan and any approved extensions.',''],
 ['Training Start Date','If training selected','First day of training, no earlier than membership start.',''],
 ['Training End Date','If training selected','Last valid training day, no later than membership end.',''],
 ['Discount Type','Yes','Select PERCENTAGE or FIXED_AMOUNT. For no discount, use FIXED_AMOUNT and 0.','FIXED_AMOUNT'],
 ['Discount Value','Yes','Percentage 0–100 or rupee amount; up to 2 decimals. Cannot exceed combined plan cost. ',100],
 ['Payment Mode','Yes','Select UPI, CASH or CARD; for unpaid customers use intended mode.','UPI'],
 ['Payment Status','Yes','Select RECEIVED, PENDING or ENQUIRED. Do not use Not Onboarded.','RECEIVED'],
 ['Amount Paid (INR)','Yes','Actual amount already received for this membership, after discount. Enter 0 if unpaid.',900],
 ['Payment Date','If amount paid > 0','Actual date of payment; do not use the import date.',''],
 ['Transaction Reference','Optional','Exact UPI/card reference as text; leave blank for cash or if unknown.',''],
 ['Notes','Optional','Explain extensions, partial payments or missing historical details.','']
];
guide.getRange('A22:D40').values=defs;
guide.getRange('A22:D40').format.wrapText=true;
guide.getRange('A22:D40').format.rowHeight=43;
guide.getRange('D25:D26').setNumberFormat('@');
function serial(y,m,d){return (Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/86400000;}
for(const [r,date] of [[29,serial(2026,10,1)],[30,serial(2026,10,31)],[38,serial(2026,10,1)]]) {guide.getRange(`D${r}`).values=[[date]];guide.getRange(`D${r}`).setNumberFormat('yyyy-mm-dd');}
guide.getRange('A42:D42').values=[['Plan field','Required?','How to fill','Fictional example']];
guide.getRange('A43:D50').values=[
 ['Gym Name','Yes','Same organization name as Members.','Sample Fitness'],
 ['Branch Name','Yes','Branch where this plan applies; mapping will be reviewed before import.','Main'],
 ['Plan Name','Yes','Unique descriptive name within gym and plan type, maximum 150 characters.','Monthly Membership'],
 ['Plan Type','Yes','Select MEMBERSHIP or PERSONAL_TRAINING.','MEMBERSHIP'],
 ['Duration Value','Yes','Positive whole number. Quarterly = 3 MONTH; half-yearly = 6 MONTH.',1],
 ['Duration Unit','Yes','Select DAY, WEEK, MONTH or YEAR. No free-text variants.','MONTH'],
 ['Plan Price (INR)','Yes','Whole rupees before discount, matching current plan API. Flag fractional legacy prices in member Notes.',1000],
 ['Currency','Yes','INR for this template.','INR']
];
guide.getRange('A43:D50').format.wrapText=true;
guide.getRange('A43:D50').format.rowHeight=43;
for(const r of [21,42]) guide.getRange(`A${r}:D${r}`).format={fill:'#13354B',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},rowHeight:30};
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'Instructions!A22:D30',tableMaxRows:9,tableMaxCols:4,maxChars:2200})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#NUM!',options:{useRegex:true,maxResults:10},maxChars:500})).ndjson);
for(const [sheetName,range,file] of [['Members','A1:G7','members'],['Members','H1:S7','members-dates'],['Plans','A1:H7','plans'],['Instructions','A2:D19','instructions'],['Instructions','A21:D40','fields'],['Instructions','A42:D50','plan-fields']]) {
 const img=await wb.render({sheetName,range,scale:1,format:'png'});
 await fs.writeFile(`${out}/${file}.png`,new Uint8Array(await img.arrayBuffer()));
}
await (await SpreadsheetFile.exportXlsx(wb)).save(`${out}/Gym_Member_Import_Template.xlsx`);
console.log('Exported Gym_Member_Import_Template.xlsx');
