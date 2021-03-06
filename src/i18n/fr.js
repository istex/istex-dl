/* eslint  max-len: "off" */
export default {
    extractMetadataXml: '<a href="https://istex-doc.gitbook.io/documentation-istex/tdm/annexes/liste-des-formats#o-xml-extensible-markup-language-langage-de-balisage-extensible" target="_blank" rel="noopener noreferrer"> Extensible Markup Language (langage de balisage extensible) </a>'
    + 'Fichier original fourni par l\'éditeur selon une DTD propre.',
    extractMetadataMods: '"Metadata Object Description Schema" :'
    + ' format de description des métadonnées (commun à tous les éditeurs)',
    extractMetadataJson: '"JavaScript Object Description Schema" : format standard permettant la représentation et'
    + ' l\'échange de données structurées',
    extractFulltextPdf: 'Texte intégral PDF "Portable Document Format"',
    extractFulltextTei: '"Text Encoding Initiative" : format de codage de documents structurés',
    extractFulltextTxt: 'Texte brut',
    extractFulltextOcr: '"Optical Character Recognition" : version améliorée du format TXT',
    extractFulltextZip: 'Format de compression de fichiers (ici, Ensemble des formats PDF et XML d\'un même fichier ?)',
    extractFulltextTiff: '"Tagged Image File Format" : format image d\'un texte ',

    extractAnnexesPdf: '"Portable Document Format"',
    extractAnnexesTxt: 'Texte brut',
    extractAnnexesDoc: 'Word : format de document Microsoft',
    extractAnnexesPpt: 'PowerPoint : format de présentation Microsoft',
    extractAnnexesXls: 'Excel : format de tableur Microsoft ',
    extractAnnexesXlsx: 'Excel : nouveau format de tableur Microsoft',
    extractAnnexesXml: '"Extensible Markup Language" : format fourni par l\'éditeur',
    extractAnnexesRtf: '"Rich Text Format" : format de texte Microsoft',
    extractAnnexesJpeg: '"Joint Photographic Experts Group" : format d\'image',
    extractAnnexesGif: '"Graphics Interchange Format" : format d\'image',
    extractAnnexesWmv: '"Windows Media Video" : format de vidéo',
    extractAnnexesQt: '"Quick Time" : format de vidéo',
    extractAnnexesMpeg: '"Moving Picture Experts Group" : format conteneur pour encapsuler'
    + ' des données de type multimédia',
    extractAnnexesMp4: ' MP4 ou MPEG4 : format conteneur pour encapsuler des données de type multimédia',
    extractAnnexesAvi: '"Audio Video Interleave" : format de stockage de données audio et vidéo',

    extractCoversPdf: '"Portable Document Format"',
    extractCoversGif: '"Graphics Interchange Format" : format d\'image',
    extractCoversJpg: '"Joint Photographic Experts Group" : format d\'image',
    extractCoversTiff: '"Tagged Image File Format" : format image d\'un texte',
    extractCoversHtml: '"HyperText Markup Language" : format de pages web',

// Exemples de requête

    orthophonie: 'orthophon* OR logothérap* OR logotherap*',

    systematiqueVegetale: '(species AND ("plant taxonomy" OR  phytogeograph*)) NOT ((fungi fungus) NOT mycorrhiz*)',
    
    geophysique: '(host.issn:"0922-6435" OR host.title:"Journal of Geophysical Research") AND publicationDate:2003 AND genre:("research-article" OR “review article”)',

    intelligenceArtificielle: '"deep learning" AND qualityIndicators.pdfVersion:[1.3 TO 1.5] AND qualityIndicators.score:[3.5 TO *]',

    arctique: '/es(k|qu)im(o|au)[sx]?/ OR  /inuit(s)?/',

    paleoclimatologie: '(african~1 + arctic~1) AND "past climate"~2',

    astrophysique: 'categories.scienceMetrix:"astronomy & astrophysics" OR categories.scopus:"astronomy and astrophysics" OR categories.wos:"astronomy & astrophysics" OR categories.inist:"astronomy"',
    
    beethoven: 'namedEntities.unitex.persName:beethoven AND namedEntities.unitex.placeName:vienna AND namedEntities.unitex.date:"eighteenth century"',

    coronavirus: 'keywords.teeft:coronavirus*',
    
    vieillissement: 'ark:/67375/HXZ-3PZ5S1MB-7\nark:/67375/HXZ-XH6SRM66-7\nark:/67375/6H6-K00Q3697-8\nark:/67375/6H6-52QRK0X3-F\nark:/67375/HXZ-H5NSV5QF-M\nark:/67375/HXZ-J1BLQKH4-3\nark:/67375/HXZ-QVSXSCHW-P\nark:/67375/HXZ-RVC4D13J-W\nark:/67375/6H6-19QHR7H2-6\nark:/67375/HXZ-0F8518D4-K\nark:/67375/6H6-9Q9HLC0X-7\nark:/67375/6H6-QTZPZZXD-H',

    echinoderme: 'id:( 733524962094471CDF009136D2986E2750742881 OR 6D092CC49B1BE5EF78DC7FBC3CBCF0C2B700BEBF OR 6A174B72611EEBBDCF634ACB8780A8CC1B868EA8 OR 4FCAF1CAD0B088B59B041C009BA43C104516BAEF OR 801B862B8C3673672B946F3E8051E4F2225AC279)',
};
