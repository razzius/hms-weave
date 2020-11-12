from signxml import XMLVerifier

from flask_saml2.sp.idphandler import IdPHandler
from flask_saml2.sp.parser import ResponseParser


class X509IdPHandler(IdPHandler):
    def get_response_parser(self, saml_response):
        return X509XmlParser(
            self.decode_saml_string(saml_response), certificate=self.certificate
        )


class X509XmlParser(ResponseParser):
    def parse_signed(self, xml_tree, certificate):
        """
        Passes ignore_ambiguous_key_info=True to ignore KeyValue and validate using X509Data only.
        """
        return (
            XMLVerifier()
            .verify(xml_tree, x509_cert=certificate, ignore_ambiguous_key_info=True)
            .signed_xml
        )
