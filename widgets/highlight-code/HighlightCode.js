'use client';

// import node module libraries
import { Fragment, useState } from 'react';
import { Clipboard, ClipboardCheck } from 'react-bootstrap-icons';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { shadesOfPurple } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const HighlightCode = ({ code }) => {
	const [isCopied, setIsCopied] = useState(false);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 3000);
		} catch (error) {
			console.error('Failed to copy text: ', error);
		}
	};

	return (
		<Fragment>
			<button
				className="copy-button"
				onClick={copyToClipboard}
				style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
			>
				{isCopied ? <ClipboardCheck /> : <Clipboard />}
				{isCopied ? 'Copied' : 'Copy'}
			</button>
			<SyntaxHighlighter language="handlebars" style={shadesOfPurple} className="rounded">
				{code}
			</SyntaxHighlighter>
		</Fragment>
	);
};

export default HighlightCode;
