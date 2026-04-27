function Loader({ message = 'Loading...', fullScreen = false }) {
  return (
    <div className={fullScreen ? 'loader-screen' : 'loader-inline'}>
      <div className="loader-dot" />
      <span>{message}</span>
    </div>
  )
}

export default Loader
