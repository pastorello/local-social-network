from rest_framework import serializers


class PlainTextField(serializers.CharField):
    """A plain-text field whose line endings are the author's, not the browser's.

    A `<textarea>`'s submitted value is normalised to CRLF by the browser, per
    the HTML spec, so an ingredient list typed with newlines arrives — and used
    to be stored — carrying carriage returns nobody typed (TD-36). Nothing looks
    wrong: `white-space: pre-line` renders `\\r\\n` as one break. It shows up
    later instead, as a diff between two translations that will not settle, or a
    line count that is off by the number of lines.

    Stored text outlives every rewrite of the code around it, which is the whole
    argument for cleaning it on the way in rather than at each place that reads
    it.
    """

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return value.replace('\r\n', '\n').replace('\r', '\n')
