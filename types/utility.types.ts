import React from 'react';

export type PropsFrom<TComponent> = TComponent extends React.FC<infer Props>
    ? Props
    : never;

export type ValuesOf<T> = T[keyof T];
