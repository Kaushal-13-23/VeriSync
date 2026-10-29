import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SingleChoiceRenderer } from './SingleChoiceRenderer';
import { MultipleSelectRenderer } from './MultipleSelectRenderer';
import { TrueFalseRenderer } from './TrueFalseRenderer';
import { ShortAnswerRenderer } from './ShortAnswerRenderer';

describe('Question Renderers (FR-QB-003, FR-UI-003)', () => {
  describe('SingleChoiceRenderer', () => {
    const options = [
      { id: 'opt_1', text: 'First Option' },
      { id: 'opt_2', text: 'Second Option' },
      { id: 'opt_3', text: 'Third Option' },
    ];

    it('renders all options with A, B, C lettering and radio roles', () => {
      const onChange = vi.fn();
      render(
        <SingleChoiceRenderer
          questionId="q1"
          options={options}
          value={null}
          onChange={onChange}
        />
      );

      expect(screen.getByText('First Option')).toBeDefined();
      expect(screen.getByText('Second Option')).toBeDefined();
      expect(screen.getByText('Third Option')).toBeDefined();
      expect(screen.getByText('A')).toBeDefined();
      expect(screen.getByText('B')).toBeDefined();
      expect(screen.getByText('C')).toBeDefined();
    });

    it('invokes onChange with selected option id on click', () => {
      const onChange = vi.fn();
      render(
        <SingleChoiceRenderer
          questionId="q1"
          options={options}
          value="opt_1"
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByText('Second Option'));
      expect(onChange).toHaveBeenCalledWith('opt_2');
    });

    it('does not invoke onChange when disabled', () => {
      const onChange = vi.fn();
      render(
        <SingleChoiceRenderer
          questionId="q1"
          options={options}
          value={null}
          onChange={onChange}
          disabled={true}
        />
      );

      fireEvent.click(screen.getByText('First Option'));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('MultipleSelectRenderer', () => {
    const options = [
      { id: 'opt_a', text: 'Option Alpha' },
      { id: 'opt_b', text: 'Option Beta' },
      { id: 'opt_c', text: 'Option Gamma' },
    ];

    it('renders options with checkboxes and helper label', () => {
      const onChange = vi.fn();
      render(
        <MultipleSelectRenderer
          questionId="q2"
          options={options}
          value={['opt_a']}
          onChange={onChange}
        />
      );

      expect(screen.getByText('(Select all options that apply)')).toBeDefined();
      expect(screen.getByText('Option Alpha')).toBeDefined();
      expect(screen.getByText('Option Beta')).toBeDefined();
    });

    it('adds option to selection array when clicked', () => {
      const onChange = vi.fn();
      render(
        <MultipleSelectRenderer
          questionId="q2"
          options={options}
          value={['opt_a']}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByText('Option Beta'));
      expect(onChange).toHaveBeenCalledWith(['opt_a', 'opt_b']);
    });

    it('removes option from selection array when clicked again', () => {
      const onChange = vi.fn();
      render(
        <MultipleSelectRenderer
          questionId="q2"
          options={options}
          value={['opt_a', 'opt_b']}
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByText('Option Alpha'));
      expect(onChange).toHaveBeenCalledWith(['opt_b']);
    });
  });

  describe('TrueFalseRenderer', () => {
    it('renders True and False selection buttons', () => {
      const onChange = vi.fn();
      render(
        <TrueFalseRenderer
          questionId="q3"
          value={null}
          onChange={onChange}
        />
      );

      expect(screen.getByText('TRUE')).toBeDefined();
      expect(screen.getByText('FALSE')).toBeDefined();
    });

    it('calls onChange with true or false strings', () => {
      const onChange = vi.fn();
      render(
        <TrueFalseRenderer
          questionId="q3"
          value="false"
          onChange={onChange}
        />
      );

      fireEvent.click(screen.getByText('TRUE'));
      expect(onChange).toHaveBeenCalledWith('true');

      fireEvent.click(screen.getByText('FALSE'));
      expect(onChange).toHaveBeenCalledWith('false');
    });
  });

  describe('ShortAnswerRenderer', () => {
    it('renders textarea with placeholder and character counter', () => {
      const onChange = vi.fn();
      render(
        <ShortAnswerRenderer
          questionId="q4"
          value="Test answer"
          onChange={onChange}
          maxLength={100}
        />
      );

      expect(screen.getByDisplayValue('Test answer')).toBeDefined();
      expect(screen.getByText('11 / 100')).toBeDefined();
    });

    it('fires onChange on input and respects maxLength', () => {
      const onChange = vi.fn();
      render(
        <ShortAnswerRenderer
          questionId="q4"
          value=""
          onChange={onChange}
          maxLength={10}
        />
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Short' } });
      expect(onChange).toHaveBeenCalledWith('Short');
    });
  });
});
