export const applyMapStyle = (map: any) => {
    map.setPaintProperty('background', 'background-color', '#3a3a3a');

    if (map.getLayer('building')) {
        map.setPaintProperty('building', 'fill-color', '#3a3a3a');
    }

    const natureLayers = ['landcover', 'park', 'park_outline'];
    natureLayers.forEach(layer => {
        if (map.getLayer(layer)) {
            map.setPaintProperty(layer, 'fill-color', '#434343');
        }
    });

    if (map.getLayer('water')) {
        map.setPaintProperty('water', 'fill-color', '#434343');
    }

    const roadLayers = map.getStyle().layers.filter((l: any) => 
        l.id.includes('road') || l.id.includes('bridge') || l.id.includes('tunnel') || l.id.includes('transportation')
    );

    roadLayers.forEach((layer: any) => {
        if (layer.type === 'line') {
            map.setPaintProperty(layer.id, 'line-color', '#565656');
        }
    });

    const labelLayers = map.getStyle().layers.filter((l: any) => l.type === 'symbol');
    labelLayers.forEach((layer: any) => {
        map.setPaintProperty(layer.id, 'text-color', '#8c8c8c');
        map.setPaintProperty(layer.id, 'text-halo-width', 0);
    });
};
