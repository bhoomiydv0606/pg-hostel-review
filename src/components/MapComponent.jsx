import { useEffect, useRef } from 'react'

export function MapComponent({ center, markers = [], zoom = 15, style = {} }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!window.google || !mapRef.current) return

    const mapOptions = {
      center,
      zoom,
      styles: [
        {
          featureType: 'all',
          elementType: 'geometry',
          stylers: [{ color: '#242f3e' }]
        },
        {
          featureType: 'all',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#242f3e' }]
        },
        {
          featureType: 'all',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#746855' }]
        }
      ]
    }

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions)

    markers.forEach(marker => {
      new window.google.maps.Marker({
        position: marker.position,
        map: mapInstanceRef.current,
        title: marker.title,
        icon: marker.icon
      })
    })
  }, [center, markers, zoom])

  return <div ref={mapRef} style={{ width: '100%', height: '300px', borderRadius: '12px', ...style }} />
}