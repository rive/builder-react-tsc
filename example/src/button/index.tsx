import { ReactNode } from 'react';
import { foobar } from '../private';
import './index.css';

export interface ButtonProps {
  children: ReactNode;
}

export default function Button({ children }: ButtonProps) {
  return (
    <button className="button">
      {children} {foobar()}
    </button>
  );
}
