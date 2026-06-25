function Shadow() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[256px] items-start left-[263px] top-[208px]" data-name="Shadow">
      <div className="bg-white relative rounded-[10px] shadow-[0px_2px_4px_0px_rgba(171,190,209,0.6)] shrink-0 size-[200px]" />
      <div className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[0] min-w-full not-italic relative shrink-0 text-[#89939e] text-[16px] tracking-[0.1px] w-[min-content]">
        <p className="leading-[24px] mb-0">2px,</p>
        <p className="leading-[24px]">#ABBED1 (60%)</p>
      </div>
    </div>
  );
}

function Shadow1() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[256px] items-start left-[487px] top-[208px]" data-name="Shadow">
      <div className="bg-white relative rounded-[10px] shadow-[0px_4px_8px_0px_rgba(171,190,209,0.4)] shrink-0 size-[200px]" />
      <div className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[0] min-w-full not-italic relative shrink-0 text-[#89939e] text-[16px] tracking-[0.1px] w-[min-content]">
        <p className="leading-[24px] mb-0">4px,</p>
        <p className="leading-[24px]">#ABBED1 (40%)</p>
      </div>
    </div>
  );
}

function Shadow2() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[256px] items-start left-[711px] top-[208px]" data-name="Shadow">
      <div className="bg-white relative rounded-[10px] shadow-[0px_6px_12px_0px_rgba(171,190,209,0.3)] shrink-0 size-[200px]" />
      <div className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[0] min-w-full not-italic relative shrink-0 text-[#89939e] text-[16px] tracking-[0.1px] w-[min-content]">
        <p className="leading-[24px] mb-0">6px,</p>
        <p className="leading-[24px]">#ABBED1 (30%)</p>
      </div>
    </div>
  );
}

function Shadow3() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[256px] items-start left-[935px] top-[208px]" data-name="Shadow">
      <div className="bg-white relative rounded-[10px] shadow-[0px_8px_16px_0px_rgba(171,190,209,0.4)] shrink-0 size-[200px]" />
      <div className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[0] min-w-full not-italic relative shrink-0 text-[#89939e] text-[16px] tracking-[0.1px] w-[min-content]">
        <p className="leading-[24px] mb-0">8px,</p>
        <p className="leading-[24px]">#ABBED1 (40%)</p>
      </div>
    </div>
  );
}

function Shadow4() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[256px] items-start left-[1159px] top-[208px]" data-name="Shadow">
      <div className="bg-white relative rounded-[10px] shadow-[0px_16px_32px_0px_rgba(171,190,209,0.3)] shrink-0 size-[200px]" />
      <div className="[word-break:break-word] font-['Inter:Regular',sans-serif] font-normal leading-[0] min-w-full not-italic relative shrink-0 text-[#89939e] text-[16px] tracking-[0.1px] w-[min-content]">
        <p className="leading-[24px] mb-0">16px,</p>
        <p className="leading-[24px]">#ABBED1 (30%)</p>
      </div>
    </div>
  );
}

export default function Effects() {
  return (
    <div className="bg-white relative size-full" data-name="Effects">
      <p className="[word-break:break-word] absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[36px] left-[60px] not-italic text-[#0671e0] text-[28px] top-[208px] tracking-[0.1px] whitespace-nowrap">Shadows</p>
      <Shadow />
      <Shadow1 />
      <Shadow2 />
      <Shadow3 />
      <Shadow4 />
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[44px] left-[720px] not-italic text-[#263238] text-[36px] text-center top-[64px] whitespace-nowrap">Effects</p>
    </div>
  );
}