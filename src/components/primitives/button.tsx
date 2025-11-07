import clsx from 'clsx';

type ButtonProps = React.ComponentProps<'button'> & {
	variant?: 'primary' | 'secondary';
};

export function Button({
	variant = 'secondary',
	children,
	className,
	...props
}: ButtonProps) {
	return (
		<button
			className={clsx(
				'inline-flex items-center gap-1 px-2 h-8 rounded-lg text-sm font-medium',
				variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
				variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}
