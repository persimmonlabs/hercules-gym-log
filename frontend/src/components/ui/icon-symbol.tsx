import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';

export interface IconSymbolProps {
  name: string;
  color: string;
  size?: number;
  weight?: string;
  style?: any;
}

export const IconSymbol: React.FC<IconSymbolProps> = ({
  name,
  color,
  size = 24,
  weight,
  style,
}) => {
  return (
    <MaterialIcons name={name as any} size={size} color={color} style={style} />
  );
};
