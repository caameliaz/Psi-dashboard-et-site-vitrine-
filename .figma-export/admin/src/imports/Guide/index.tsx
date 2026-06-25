export default function Guide() {
  return (
    <div className="bg-white relative size-full" data-name="Guide">
      <div className="absolute bg-[#d9d9d9] h-[56px] left-0 top-[292px] w-[144px]" />
      <div className="absolute h-[56px] left-[calc(100%-144px)] top-[292px] w-[144px]" data-name="Union">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 144 56">
          <path d="M144 0V56H0V0H144Z" fill="var(--fill-0, #D9D9D9)" id="Union" />
        </svg>
      </div>
      <div className="absolute bg-[#d9d9d9] h-[56px] left-[calc(91.67%-122px)] top-[292px] w-[24px]" />
      <div className="absolute bg-[#d9d9d9] h-[56px] left-[calc(8.33%+98px)] top-[292px] w-[24px]" />
      <p className="[word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[36px] left-[46px] not-italic text-[#abbed1] text-[28px] top-[244px] whitespace-nowrap">144</p>
      <p className="[word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[36px] left-[calc(100%-98px)] not-italic text-[#abbed1] text-[28px] top-[244px] whitespace-nowrap">144</p>
      <p className="[word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[36px] left-[211px] not-italic text-[#abbed1] text-[28px] top-[244px] whitespace-nowrap">24</p>
      <p className="[word-break:break-word] absolute font-['Inter:Bold',sans-serif] font-bold leading-[36px] left-[calc(83.33%-9px)] not-italic text-[#abbed1] text-[28px] top-[244px] whitespace-nowrap">24</p>
    </div>
  );
}