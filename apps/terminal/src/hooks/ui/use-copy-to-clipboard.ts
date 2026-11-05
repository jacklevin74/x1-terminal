import { t } from "@lingui/core/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function useCopyToClipboard(resetDelay = 1500) {
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function clearTimer() {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}

	const reset = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setCopied(false);
	}, []);

	async function copy(text: string, onError?: () => void) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			if (onError) onError();
			else toast.error(t`Couldn't copy. Select the text and copy it manually.`);
			return false;
		}
		setCopied(true);
		clearTimer();
		timeoutRef.current = setTimeout(() => {
			setCopied(false);
		}, resetDelay);
		return true;
	}

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	return { copied, copy, reset };
}
