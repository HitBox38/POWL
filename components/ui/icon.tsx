import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cssInterop } from 'nativewind';
import * as React from 'react';

const StyledIcon = cssInterop(MaterialIcons, {
  className: {
    target: 'style',
    nativeStyleToProp: { color: true },
  },
});

type IconProps = React.ComponentProps<typeof MaterialIcons> & { className?: string };

function Icon({ className, size = 14, ...props }: IconProps) {
  const textClass = React.useContext(TextClassContext);

  return (
    <StyledIcon
      className={cn('text-foreground', textClass, className)}
      size={size}
      {...props}
    />
  );
}

export { Icon };
