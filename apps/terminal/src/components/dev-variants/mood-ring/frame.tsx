import { type ReactNode, useEffect, useRef, useState } from "react";

interface Props {
	children: ReactNode;
}

export function Frame({ children }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(() => setScale(Math.min(el.clientWidth / 1512, el.clientHeight / 900)));
		ro.observe(el);
		return () => ro.disconnect();
	}, []);
	return (
		<div
			ref={ref}
			className="absolute inset-x-0 top-10 bottom-0 flex items-center justify-center overflow-hidden bg-background"
		>
			<div
				className="relative flex-none overflow-hidden font-sans text-fg"
				style={{
					width: 1512,
					height: 900,
					transform: `scale(${scale})`,
					backgroundImage: "url(/dev-refs/mood-ring/terminal.png)",
					backgroundSize: "1512px 900px",
				}}
			>
				{children}
			</div>
		</div>
	);
}
