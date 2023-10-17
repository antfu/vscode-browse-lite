import React from 'react'
import './error-page.css'

export function UimExclamationCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10" className="uim-tertiary" opacity=".5" fill="currentColor"></circle>
      <circle cx="12" cy="16" r="1" className="uim-primary" fill="currentColor"></circle>
      <path className="uim-primary" d="M12 13a1 1 0 0 1-1-1V8a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1z" fill="currentColor"></path>
    </svg>
  )
}

export function ErrorPage(props: {
  errorText?: string
  onActionInvoked?: any
} = {}) {
  function handleRefresh() {
    props.onActionInvoked('refresh', {})
  }

  return (
    <div className="error-page">
      <UimExclamationCircle className="icon" />
      <div className="title">Failed to load the page</div>
      <div className="message">{ props.errorText || null }</div>
      <button
        style={{ width: 'auto', fontSize: '0.9em', padding: '8px 12px' }}
        onClick={handleRefresh}
      >
        Refresh
      </button>
    </div>
  )
}
