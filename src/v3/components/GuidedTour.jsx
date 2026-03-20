import React, { useState, useEffect, useCallback } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useAppState } from '../contexts/StateContext';

const STEPS = [
  {
    target: '[data-tour="dashboard-overview"]',
    title: 'Dashboard — Overview',
    content:
      'Track gross revenue vs. your annual profit target in real time. The revenue chart and metric cards give you a live snapshot of your business health.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="income-overview"]',
    title: 'Gross vs. Net & Take-Home',
    content:
      'Gross is total revenue. After deducting business expenses, half of SE tax, and the 20% QBI deduction, the engine calculates your true taxable income and take-home pay.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="writeoffs"]',
    title: 'Write-offs: Mileage & Home Office',
    content:
      'Every business mile driven and every sq ft of your home office reduces taxable income. Enter your numbers and watch your tax savings update instantly.',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '[data-tour="roi-analyzer"]',
    title: 'ROI Purchase Analyzer',
    content:
      'Considering new gear? Enter the cost and deductibility to see the true after-tax price. Your tax bracket effectively discounts every legitimate business purchase.',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '[data-tour="compliance-status"]',
    title: 'Compliance — Tracking Deadlines',
    content:
      'Stay on top of quarterly estimated tax payments, LLC filings, and annual obligations. Check items off as you complete them — your Corporate Veil Score updates live.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="settings-profile"]',
    title: 'Settings — Profile & Integrations',
    content:
      'Set your business name, state, and annual profit target here. Your profile flows through every module. Connect Gmail under integrations to power the Email Ops tab.',
    disableBeacon: true,
    placement: 'bottom',
  },
];

// Which app tab each step requires
const TAB_BY_STEP = ['dashboard', 'taxes', 'taxes', 'taxes', 'compliance', 'settings'];

const JOYRIDE_STYLES = {
  options: {
    primaryColor: '#5F6F65',
    backgroundColor: '#FFFFFF',
    textColor: '#332F2E',
    arrowColor: '#FFFFFF',
    overlayColor: 'rgba(17, 24, 39, 0.65)',
    zIndex: 1000,
    width: 340,
  },
  buttonNext: {
    backgroundColor: '#5F6F65',
    borderRadius: '12px',
    fontWeight: '900',
    fontSize: '13px',
    padding: '10px 20px',
    fontFamily: 'inherit',
  },
  buttonBack: {
    color: '#8A7A6A',
    fontWeight: '700',
    fontSize: '13px',
    fontFamily: 'inherit',
    marginRight: '8px',
  },
  buttonClose: {
    color: '#9C8A7A',
  },
  buttonSkip: {
    color: '#9C8A7A',
    fontWeight: '700',
    fontSize: '12px',
    fontFamily: 'inherit',
  },
  tooltip: {
    borderRadius: '20px',
    padding: '24px',
    fontFamily: 'inherit',
    boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
  },
  tooltipTitle: {
    fontWeight: '900',
    fontSize: '15px',
    color: '#2C2511',
    marginBottom: '6px',
    fontFamily: 'inherit',
  },
  tooltipContent: {
    fontSize: '13px',
    color: '#8A7A6A',
    lineHeight: '1.65',
    padding: '0',
    fontFamily: 'inherit',
  },
  tooltipFooter: {
    marginTop: '16px',
  },
  spotlight: {
    borderRadius: '16px',
  },
};

const GuidedTour = () => {
  const { setActiveTab, setRunTour } = useAppState();
  const [stepIndex, setStepIndex] = useState(0);
  const [run, setRun] = useState(false);

  // Navigate to Dashboard first, then start after DOM settles
  useEffect(() => {
    setActiveTab('dashboard');
    const t = setTimeout(() => setRun(true), 350);
    return () => clearTimeout(t);
  }, [setActiveTab]);

  const handleCallback = useCallback(
    ({ action, index, status, type }) => {
      if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
        setRunTour(false);
        return;
      }

      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        const next = index + (action === ACTIONS.PREV ? -1 : 1);
        if (next < 0 || next >= STEPS.length) return;

        const nextTab = TAB_BY_STEP[next];
        const currTab = TAB_BY_STEP[index];

        if (nextTab !== currTab) {
          // Pause joyride, switch tab, then resume on next step
          setRun(false);
          setActiveTab(nextTab);
          setTimeout(() => {
            setStepIndex(next);
            setRun(true);
          }, 350);
        } else {
          setStepIndex(next);
        }
      }
    },
    [setActiveTab, setRunTour],
  );

  return (
    <Joyride
      steps={STEPS}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      disableOverlayClose
      disableScrolling={false}
      disableCloseOnEsc={false}
      styles={JOYRIDE_STYLES}
      locale={{
        back: '← Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next →',
        skip: 'Skip tour',
      }}
      callback={handleCallback}
    />
  );
};

export default GuidedTour;
