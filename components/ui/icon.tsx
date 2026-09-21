import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cssInterop } from 'nativewind';
import * as React from 'react';
import { Platform } from 'react-native';

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
      // Suppress RNVI's inline black default so web theme classes can set color.
      color={Platform.OS === 'web' ? '' : undefined}
      className={cn('text-foreground', textClass, className)}
      size={size}
      {...props}
    />
  );
}

export { Icon };
